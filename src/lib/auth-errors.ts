/**
 * Maps Supabase Auth error messages to user-friendly localized strings.
 * Centralised here so signup, login, and reset-password forms all share
 * the same translations — add new mappings once, they apply everywhere.
 */

/** Errors returned by supabase.auth.signUp() */
export function getSignupError(message: string, isFR: boolean): string {
  const msg = message.toLowerCase();
  if (msg.includes("anonymous sign-ins are disabled")) {
    return isFR
      ? "Veuillez renseigner votre email et mot de passe."
      : "Please enter your email and password.";
  }
  if (msg.includes("password should be at least")) {
    return isFR
      ? "Le mot de passe doit contenir au moins 8 caractères."
      : "Password must be at least 8 characters.";
  }
  if (msg.includes("user already registered") || msg.includes("email address has already been registered")) {
    return isFR
      ? "Un compte existe déjà avec cet email."
      : "An account already exists with this email.";
  }
  if (msg.includes("invalid email") || msg.includes("unable to validate email address")) {
    return isFR
      ? "L'adresse email n'est pas valide."
      : "The email address is not valid.";
  }
  // Hook failure: Supabase couldn't send the confirmation email (missing SUPABASE_HOOK_SECRET,
  // Resend error, or email hook misconfigured in Supabase dashboard).
  if (msg.includes("unexpected_failure") || msg.includes("hook") || msg.includes("send email")) {
    return isFR
      ? "L'envoi de l'email de confirmation a échoué. Veuillez réessayer ou contacter le support."
      : "Failed to send confirmation email. Please try again or contact support.";
  }
  // Rate limiting
  if (msg.includes("over_request_rate_limit") || msg.includes("for security purposes")) {
    return isFR
      ? "Trop de tentatives. Veuillez patienter quelques minutes."
      : "Too many attempts. Please wait a few minutes.";
  }
  return isFR
    ? "Une erreur est survenue. Veuillez réessayer."
    : "An error occurred. Please try again.";
}
