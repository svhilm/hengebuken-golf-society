import { sql } from "drizzle-orm";
import { pgTable, text, varchar, date, timestamp, boolean, integer, numeric, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User authentication table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("andre"), // 'admin', 'hengebuk', 'aspirant', 'andre'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address"),
  postNumber: varchar("post_number"),
  city: text("city"),
  country: varchar("country").notNull().default("+47"),
  email: text("email"),
  phone: varchar("phone"),
  golfNumber: varchar("golf_number"),
  villaNummer: varchar("villa_nummer"),
  handicap: numeric("handicap", { precision: 4, scale: 1 }).notNull(),
  hcpEditable: boolean("hcp_editable").default(true),
  role: text("role").default("Hengebuk"),
  innmeldt: varchar("innmeldt"),
  birthDate: varchar("birth_date"),
  initials: varchar("initials", { length: 3 }).notNull(),
  displayOrder: numeric("display_order").default(sql`0`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const spainPresence = pgTable("spain_presence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  arrivalDate: date("arrival_date").notNull(),
  departureDate: date("departure_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teeTimes = pgTable("tee_times", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  date: date("date").notNull(),
  time: text("time").notNull(),
  course: text("course"),
});

export const socialEvents = pgTable("social_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  type: text("type").notNull(),
  date: date("date").notNull(),
  time: text("time").notNull(),
  location: text("location").notNull(),
  description: text("description"),
  rsvpRequired: boolean("rsvp_required").default(false),
  createdById: varchar("created_by_id").notNull().references(() => members.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventRsvps = pgTable("event_rsvps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => socialEvents.id),
  memberId: varchar("member_id").notNull().references(() => members.id),
  status: text("status").notNull().default("attending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Social messages table
export const socialMessages = pgTable("social_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  signature: text("signature"),
  authorId: varchar("author_id").notNull(),
  authorName: varchar("author_name").notNull(),
  recipientRoles: text("recipient_roles").array().notNull().default(sql`'{}'`),
  createdAt: timestamp("created_at").defaultNow(),
});

// Absence tracking table for members temporarily away during Spain presence
export const absences = pgTable("absences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  date: date("date").notNull(),
  reason: text("reason").notNull(), // e.g., "Hjemme", "i møte", "syk", etc.
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  displayOrder: true,
});

export const insertSpainPresenceSchema = createInsertSchema(spainPresence).omit({
  id: true,
  createdAt: true,
});

export const insertTeeTimeSchema = createInsertSchema(teeTimes).omit({
  id: true,
});

export const insertSocialEventSchema = createInsertSchema(socialEvents).omit({
  id: true,
  createdAt: true,
});

export const insertEventRsvpSchema = createInsertSchema(eventRsvps).omit({
  id: true,
  createdAt: true,
});

export const insertSocialMessageSchema = createInsertSchema(socialMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAbsenceSchema = createInsertSchema(absences).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;

export type SpainPresence = typeof spainPresence.$inferSelect;
export type InsertSpainPresence = z.infer<typeof insertSpainPresenceSchema>;

export type TeeTime = typeof teeTimes.$inferSelect;
export type InsertTeeTime = z.infer<typeof insertTeeTimeSchema>;

export type SocialEvent = typeof socialEvents.$inferSelect;
export type InsertSocialEvent = z.infer<typeof insertSocialEventSchema>;

export type EventRsvp = typeof eventRsvps.$inferSelect;
export type InsertEventRsvp = z.infer<typeof insertEventRsvpSchema>;

export type SocialMessage = typeof socialMessages.$inferSelect;
export type InsertSocialMessage = z.infer<typeof insertSocialMessageSchema>;

export type Absence = typeof absences.$inferSelect;
export type InsertAbsence = z.infer<typeof insertAbsenceSchema>;
