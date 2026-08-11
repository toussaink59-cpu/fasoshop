import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { db } from '@/lib/db';
import { loginLimiter, createNextRateLimit } from '@/lib/rate-limit';

// Middleware rate limiting
const limiterMiddleware = createNextRateLimit(loginLimiter);

export async function POST(request) {
  try {
    // Appliquer le rate limiting
    const limitResponse = await limiterMiddleware(request);
    if (limitResponse) {
      return limitResponse;
    }

    const body = await request.json();
    const { email, password } = body;

    // Validation des inputs
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Format invalide' },
        { status: 400 }
      );
    }

    // Nettoyer les inputs (trim)
    const cleanEmail = email.trim().toLowerCase();
    
    // Validation basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      );
    }

    // Vérification longueur mot de passe
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur depuis la base de données
    const user = await db.user.findUnique({
      where: { email: cleanEmail },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      // Délai constant pour éviter le timing attack
      await new Promise(resolve => setTimeout(resolve, 100));
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Vérifier le mot de passe
    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Vérifier si l'utilisateur est vérifié (optionnel)
    if (!user.isVerified) {
      return NextResponse.json(
        { error: 'Compte non vérifié. Veuillez vérifier votre email.' },
        { status: 403 }
      );
    }

    // Générer le token JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET non configuré');
      throw new Error('Configuration serveur invalide');
    }

    const token = sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      {
        expiresIn: '7d',
        issuer: 'fasoshop',
      }
    );

    // Créer la réponse avec cookie sécurisé
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    // Définir le cookie HTTP-only
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 jours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
