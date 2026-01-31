'use client';

import {
  signIn as _signIn,
  signUp as _signUp,
  signOut as _signOut,
  confirmSignUp as _confirmSignUp,
  resetPassword as _resetPassword,
  resendSignUpCode as _resendSignUpCode,
  confirmResetPassword as _confirmResetPassword,
} from 'aws-amplify/auth';

/** **************************************
 * Sign in
 *************************************** */
export const signInWithPassword = async ({ username, password }) => {
  await _signIn({ username, password });
};

/** **************************************
 * Sign up
 *************************************** */
export const signUp = async ({ username, password, firstName, lastName }) => {
  await _signUp({
    username,
    password,
    options: { userAttributes: { email: username, given_name: firstName, family_name: lastName } },
  });
};

/** **************************************
 * Confirm sign up
 *************************************** */
export const confirmSignUp = async ({ username, confirmationCode }) => {
  await _confirmSignUp({ username, confirmationCode });
};

/** **************************************
 * Resend code sign up
 *************************************** */
export const resendSignUpCode = async ({ username }) => {
  await _resendSignUpCode({ username });
};

/** **************************************
 * Sign out
 *************************************** */
export const signOut = async () => {
  await _signOut();
};

/** **************************************
 * Reset password
 *************************************** */
export const resetPassword = async ({ username }) => {
  await _resetPassword({ username });
};

/** **************************************
 * Update password
 *************************************** */
export const updatePassword = async ({ username, confirmationCode, newPassword }) => {
  await _confirmResetPassword({ username, confirmationCode, newPassword });
};
