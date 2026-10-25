// FitForm Validation Module
// Strict checks on user profile inputs with human-readable error messages.

export interface UserInputData {
  name: string;
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
  goal: string;
  experience: string;
  daysPerWeek: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateUserProfile(data: Partial<UserInputData>): ValidationResult {
  const errors: Record<string, string> = {};

  // Name validation
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.name = 'Please enter your full name or nickname.';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  } else if (data.name.trim().length > 50) {
    errors.name = 'Name cannot exceed 50 characters.';
  }

  // Age validation: 13-80
  const age = Number(data.age);
  if (isNaN(age) || !Number.isInteger(age)) {
    errors.age = 'Age must be a valid whole number.';
  } else if (age < 13 || age > 80) {
    errors.age = 'Age must be between 13 and 80 years old.';
  }

  // Gender validation: male / female / other
  const validGenders = ['male', 'female', 'other'];
  if (!data.gender || !validGenders.includes(data.gender.toLowerCase())) {
    errors.gender = 'Please select a gender (male, female, or other).';
  }

  // Height validation: 100-230 cm
  const height = Number(data.heightCm);
  if (isNaN(height)) {
    errors.heightCm = 'Height must be a valid number.';
  } else if (height < 100 || height > 230) {
    errors.heightCm = 'Height must be between 100 cm and 230 cm.';
  }

  // Weight validation: 30-250 kg
  const weight = Number(data.weightKg);
  if (isNaN(weight)) {
    errors.weightKg = 'Weight must be a valid number.';
  } else if (weight < 30 || weight > 250) {
    errors.weightKg = 'Weight must be between 30 kg and 250 kg.';
  }

  // Goal validation: fat loss / muscle gain / maintain
  const validGoals = ['fat_loss', 'muscle_gain', 'maintain'];
  if (!data.goal || !validGoals.includes(data.goal.toLowerCase())) {
    errors.goal = 'Please choose a goal: Fat Loss, Muscle Gain, or Maintain.';
  }

  // Experience validation: beginner / intermediate / advanced
  const validExp = ['beginner', 'intermediate', 'advanced'];
  if (!data.experience || !validExp.includes(data.experience.toLowerCase())) {
    errors.experience = 'Please select your fitness experience level.';
  }

  // Workout days per week: 3-6
  const days = Number(data.daysPerWeek);
  if (isNaN(days) || !Number.isInteger(days)) {
    errors.daysPerWeek = 'Workout days must be a whole number.';
  } else if (days < 3 || days > 6) {
    errors.daysPerWeek = 'Workout frequency must be between 3 and 6 days per week.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
