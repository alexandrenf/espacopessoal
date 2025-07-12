import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily cleanup of unused profile pictures
crons.daily(
  "cleanup-unused-profile-pictures",
  { hourUTC: 2, minuteUTC: 0 }, // Run at 2:00 AM UTC daily
  internal.users.cleanupUnusedProfilePictures,
);

export default crons;
