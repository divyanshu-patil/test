# Product Requirements — Socially

## 1. Product summary
Build a responsive social media website inspired by Instagram's core interaction model. Users can create profiles, publish photo posts, follow people, browse a personalized feed, and interact through likes and comments.

## 2. Goals
- Make account creation and publishing straightforward.
- Help users discover people and content.
- Make the main feed fast, accessible, and mobile-friendly.
- Establish privacy, security, and moderation foundations early.

## 3. Out of scope for MVP
Reels editing, livestreams, end-to-end encrypted DMs, advanced recommendation ranking, advertising, creator payouts, and native mobile apps. Stories can be a later milestone.

## 4. Personas
- **Casual user:** follows friends and checks their feed.
- **Creator:** publishes photos and captions, manages a profile, and checks engagement.
- **Private account owner:** approves follow requests and controls visibility.
- **Moderator/admin:** handles reports and abusive content (moderation console may follow MVP).

## 5. Functional requirements

### Authentication and account
- FR-001: Register with email, username, and password.
- FR-002: Log in and log out securely.
- FR-003: View and update own profile: display name, bio, avatar.
- FR-004: Enforce unique, normalized usernames and emails.
- FR-005: Support password reset and email verification before production launch.
- FR-006: Allow account privacy to be set to public or private.

### Profiles and relationships
- FR-010: View public user profiles and post grids.
- FR-011: Follow and unfollow public accounts.
- FR-012: Create pending follow requests for private accounts; owners can approve/reject.
- FR-013: Display follower/following counts and lists, subject to privacy rules.
- FR-014: Block users and prevent blocked users from following or interacting (launch requirement).
- FR-015: Search users by username/display name.

### Posts and media
- FR-020: Create a post with one or more images and a caption.
- FR-021: Preview media before publishing and show upload progress/errors.
- FR-022: Edit a caption and delete one's own post.
- FR-023: Display image alt text support for accessibility.
- FR-024: Enforce upload size/type limits and reject unsafe files.
- FR-025: Support hashtags as searchable post metadata.

### Feed and engagement
- FR-030: Show a newest-first feed of accessible posts from followed accounts.
- FR-031: Like/unlike a post; each user has at most one like per post.
- FR-032: Add, list, and delete comments subject to authorization.
- FR-033: Save/unsave posts to a private saved collection.
- FR-034: Open a post detail view with media, caption, comments, and counts.
- FR-035: Use cursor pagination for feed and comment lists.

### Discovery and notifications
- FR-040: Explore recent public posts.
- FR-041: Search users and hashtags.
- FR-042: Notify users about follows/follow requests, likes, and comments.
- FR-043: Mark notifications as read and show unread count.

### Safety and settings
- FR-050: Report a post or account.
- FR-051: Block/unblock users.
- FR-052: Provide account privacy and session settings.
- FR-053: Prevent unauthorized access to private content at the API layer.
- FR-054: Provide account deletion and data export workflows before public launch.

## 6. Non-functional requirements
- NFR-001: Responsive layout at mobile, tablet, and desktop breakpoints.
- NFR-002: Meet WCAG 2.2 AA as a target; keyboard navigation and visible focus states required.
- NFR-003: API p95 response target below 300 ms for common non-upload reads under expected MVP load (excluding external storage).
- NFR-004: Use migrations and constraints to protect data integrity.
- NFR-005: No secrets committed to source control.
- NFR-006: Rate-limit authentication, comments, follows, likes, and uploads.
- NFR-007: Provide health checks, structured logs, error monitoring, and backup/restore procedures.
- NFR-008: All timestamps stored in UTC.
- NFR-009: Automated tests cover authentication, privacy boundaries, ownership, and primary interactions.
- NFR-010: Media is stored outside the relational database.

## 7. MVP acceptance criteria
- A new user can register, log in, edit a profile, and log out.
- A user can upload an image post and see it in their profile.
- A user can follow another public account and see that account's posts in the feed.
- A user can like/unlike, comment, save, and delete their own post.
- Private-account content is inaccessible until a follow request is approved.
- Users cannot edit/delete another user's post or comment.
- Pagination works without duplicate items during normal feed browsing.
- Upload errors, empty states, and loading states are clear and accessible.
- Core flows pass automated tests and run in local development using documented setup steps.

## 8. Product analytics (privacy-aware)
Measure sign-up completion, first-post completion, follow conversion, feed engagement, upload failures, and retention. Do not collect sensitive data without a clear purpose and disclosure.
