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
  if (msg.includes("user already registered")) {
    return isFR
      ? "Un compte existe déjà avec cet email."
      : "An account already exists with this email.";
  }
  if (msg.includes("invalid email")) {
    return isFR
      ? "L'adresse email n'est pas valide."
      : "The email address is not valid.";
  }
  return isFR
    ? "Une erreur est survenue. Veuillez réessayer."
    : "An error occurred. Please try again.";
}
