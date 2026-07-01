'use client'

import { createContext, useContext } from 'react'
import type { Lang } from './i18n'

export const LangContext = createContext<Lang>('en')
export function useLang(): Lang { return useContext(LangContext) }
