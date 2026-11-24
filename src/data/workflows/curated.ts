import type { AppCurated, AppKey } from './types';
import { education } from './curatedEducation';
import { rimi, trade, digital } from './curatedOthers';

export const CURATED: Record<AppKey, AppCurated> = { education, rimi, trade, digital };
