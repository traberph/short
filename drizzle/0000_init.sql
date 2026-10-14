CREATE TABLE `api_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_tokens_token_hash_unique` ON `api_tokens` (`token_hash`);--> statement-breakpoint
CREATE TABLE `blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` integer NOT NULL,
	`position` integer NOT NULL,
	`kind` text NOT NULL,
	`label` text,
	`markdown` text,
	`target_id` integer,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `blocks_page` ON `blocks` (`page_id`,`position`);--> statement-breakpoint
CREATE INDEX `blocks_target` ON `blocks` (`target_id`);--> statement-breakpoint
CREATE TABLE `clicks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` integer NOT NULL,
	`at` integer NOT NULL,
	`day` text NOT NULL,
	`visitor` text NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `clicks_page_day` ON `clicks` (`page_id`,`day`,`visitor`);--> statement-breakpoint
CREATE INDEX `clicks_at` ON `clicks` (`at`);--> statement-breakpoint
CREATE TABLE `daily_stats` (
	`page_id` integer NOT NULL,
	`day` text NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`uniques` integer DEFAULT 0 NOT NULL,
	`last_at` integer NOT NULL,
	PRIMARY KEY(`page_id`, `day`),
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`namespace` text NOT NULL,
	`code` text NOT NULL,
	`kind` text NOT NULL,
	`dest` text,
	`title` text,
	`avatar` text,
	`theme` text,
	`created_by` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pages_namespace_code` ON `pages` (`namespace`,`code`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sub` text NOT NULL,
	`username` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_sub_unique` ON `users` (`sub`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);