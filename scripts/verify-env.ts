/**
 * Environment Variable Verification Script
 * Run this to check if all required environment variables are set for production
 */

const requiredVars = [
  'MONGODB_URI',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
];

const optionalVars = [
  'ALLOWED_ORIGINS',
  'MFA_ENCRYPTION_KEY',
  'NVIDIA_API_KEY',
  'NVIDIA_BASE_URL',
  'NVIDIA_AI_MODEL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'PAYSTACK_PUBLIC_KEY',
  'PAYSTACK_SECRET_KEY',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
];

console.log('🔍 Checking Environment Variables...\n');

const missingRequired: string[] = [];
const missingOptional: string[] = [];

// Check required variables
console.log('Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: MISSING`);
    missingRequired.push(varName);
  } else {
    // Show masked value for secrets
    if (varName.includes('SECRET') || varName.includes('KEY') || varName.includes('PASSWORD')) {
      console.log(`✅ ${varName}: SET (${value.substring(0, 4)}${'*'.repeat(Math.min(value.length - 4, 20))})`);
    } else {
      console.log(`✅ ${varName}: SET`);
    }
  }
});

// Check optional variables
console.log('\nOptional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`⚠️  ${varName}: NOT SET (optional)`);
    missingOptional.push(varName);
  } else {
    if (varName.includes('SECRET') || varName.includes('KEY') || varName.includes('PASSWORD')) {
      console.log(`✅ ${varName}: SET (${value.substring(0, 4)}${'*'.repeat(Math.min(value.length - 4, 20))})`);
    } else {
      console.log(`✅ ${varName}: SET`);
    }
  }
});

// Security checks
console.log('\n🔒 Security Checks:');

// Check NEXTAUTH_SECRET strength
const nextauthSecret = process.env.NEXTAUTH_SECRET;
if (nextauthSecret) {
  if (nextauthSecret.length < 32) {
    console.log('❌ NEXTAUTH_SECRET: Too short (must be at least 32 characters)');
    missingRequired.push('NEXTAUTH_SECRET (weak)');
  } else if (nextauthSecret === 'your-secret-key-change-this-in-production' || 
             nextauthSecret === 'your_nextauth_secret_here') {
    console.log('❌ NEXTAUTH_SECRET: Using default value (must be changed)');
    missingRequired.push('NEXTAUTH_SECRET (default)');
  } else {
    console.log('✅ NEXTAUTH_SECRET: Strong enough');
  }
}

// Check ALLOWED_ORIGINS
const allowedOrigins = process.env.ALLOWED_ORIGINS;
if (allowedOrigins) {
  if (allowedOrigins.includes('localhost') && !allowedOrigins.includes(process.env.NEXTAUTH_URL || '')) {
    console.log('⚠️  ALLOWED_ORIGINS: Contains localhost (OK for development)');
  } else {
    console.log('✅ ALLOWED_ORIGINS: Configured');
  }
} else {
  console.log('⚠️  ALLOWED_ORIGINS: Not set (using default)');
}

// Check MFA_ENCRYPTION_KEY shape (must decode to exactly 32 bytes, or 2FA
// setup/verification will fail with a clear runtime error - see
// src/lib/mfa-crypto.ts)
const mfaKey = process.env.MFA_ENCRYPTION_KEY;
if (mfaKey) {
  const decodedLength = Buffer.from(mfaKey, 'base64').length;
  if (decodedLength !== 32) {
    console.log(`❌ MFA_ENCRYPTION_KEY: Must decode to exactly 32 bytes (got ${decodedLength})`);
    missingRequired.push('MFA_ENCRYPTION_KEY (invalid length)');
  } else {
    console.log('✅ MFA_ENCRYPTION_KEY: Valid length');
  }
} else {
  console.log('⚠️  MFA_ENCRYPTION_KEY: Not set (2FA will be unavailable)');
}

// Check MongoDB URI
const mongoUri = process.env.MONGODB_URI;
if (mongoUri) {
  if (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
    console.log('⚠️  MONGODB_URI: Using localhost (OK for development)');
  } else if (mongoUri.includes('ssl=true') || mongoUri.includes('tls=true')) {
    console.log('✅ MONGODB_URI: SSL/TLS enabled');
  } else {
    console.log('⚠️  MONGODB_URI: SSL/TLS not explicitly enabled');
  }
}

// Summary
console.log('\n📊 Summary:');
if (missingRequired.length === 0) {
  console.log('✅ All required environment variables are set');
} else {
  console.log(`❌ Missing ${missingRequired.length} required variable(s):`, missingRequired.join(', '));
}

if (missingOptional.length > 0) {
  console.log(`⚠️  ${missingOptional.length} optional variable(s) not set:`, missingOptional.join(', '));
}

if (missingRequired.length === 0) {
  console.log('\n✅ Ready for production!');
  process.exit(0);
} else {
  console.log('\n❌ Not ready for production. Please set the missing required variables.');
  process.exit(1);
}
