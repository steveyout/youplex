'use client';

import { createContext } from 'react';

// ----------------------------------------------------------------------

export const AuthContext = createContext(undefined);

export const AuthConsumer = AuthContext.Consumer;
