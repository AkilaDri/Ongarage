// OnGarage points for owners (the reward at the end of an SOS job). Points are earned by finishing a job, never by the stars given:
// a job closed with the owner's code earns the base points, and rating it (any number of stars) adds a small bonus once. A rating that
// is low therefore earns the same as a high one, so owners are not pushed to rate high. Points expire, and one job is awarded only once.

/** Points for a job closed with the owner's code. */
export const BASE_POINTS_PER_JOB = 100;

/** Added once when the owner rates the job, whatever the stars. */
export const RATING_BONUS_POINTS = 25;

/** Points stop counting this many months after they were earned. */
export const POINTS_EXPIRY_MONTHS = 12;

const DAY = 24 * 60 * 60 * 1000;

export interface PointsAward {
  /** The job the points were earned on (one award per job). */
  jobId: string;
  base: number;
  ratingBonus: number;
  /** When the job was closed (ms). */
  at: number;
}

export interface PointsJob {
  /** Closed with the owner's code (the only way a job earns points). */
  closed: boolean;
  /** The owner rated the job (stars do not change the points). */
  rated: boolean;
}

/** The points a job is worth, broken down. */
export const pointsForJob = (job: PointsJob): { base: number; ratingBonus: number; total: number } => {
  if (!job.closed) return { base: 0, ratingBonus: 0, total: 0 };
  const base = BASE_POINTS_PER_JOB;
  const ratingBonus = job.rated ? RATING_BONUS_POINTS : 0;
  return { base, ratingBonus, total: base + ratingBonus };
};

/** The award to record for a job, or null when it earns nothing (not closed). */
export const awardFor = (jobId: string, job: PointsJob, at: number): PointsAward | null => {
  const points = pointsForJob(job);
  if (points.total === 0) return null;
  return { jobId, base: points.base, ratingBonus: points.ratingBonus, at };
};

/** A job is awarded at most once: a second award for the same job is refused. */
export const hasAward = (awards: PointsAward[], jobId: string): boolean => awards.some((a) => a.jobId === jobId);

/** Whether an award is still counting at `now`. */
export const awardCounts = (award: PointsAward, now: number): boolean => now - award.at <= POINTS_EXPIRY_MONTHS * 30 * DAY;

/** The owner's current balance: the points of every award that has not expired. */
export const pointsBalance = (awards: PointsAward[], now: number): number =>
  awards.filter((a) => awardCounts(a, now)).reduce((sum, a) => sum + a.base + a.ratingBonus, 0);
