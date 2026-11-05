import { newLearner, normEmail, validEmail, type SignUpInput } from '@laporte/shared';
import { learnerRepository } from '../repositories/learnerRepository';
import { AppError } from '../utils/errors';
import { nextId } from '../utils/ids';

/*
 * Demo accounts: sign-up creates a learner, log-in finds them by email. There are no passwords in
 * the prototype; a live portal would add a real identity provider (password or magic link) here.
 */
export const authService = {
  register(input: SignUpInput) {
    if (input.name.trim().length < 2) throw new AppError(422, 'invalid_name', 'Enter your name.');
    if (!validEmail(input.email)) throw new AppError(422, 'invalid_email', 'Enter a valid email address.');
    if (learnerRepository.byEmail(input.email)) throw new AppError(409, 'email_taken', 'An account already uses this email. Log in instead.');
    const learner = newLearner(input, nextId('lrn'), new Date().toISOString().slice(0, 10));
    return learnerRepository.insert(learner);
  },
  login(email: string) {
    const learner = learnerRepository.byEmail(normEmail(email));
    if (!learner) throw new AppError(404, 'no_account', 'No account uses this email. Check it, or create an account.');
    return learner;
  },
};
