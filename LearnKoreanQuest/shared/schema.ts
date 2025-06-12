import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
});

export const regulations = pgTable("regulations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  article: text("article"),
  content: text("content").notNull(),
  effectiveDate: timestamp("effective_date"),
  priority: text("priority").notNull().default("중간"),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const policies = pgTable("policies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fileName: text("file_name").notNull(),
  content: text("content").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  departmentId: integer("department_id").references(() => departments.id),
});

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  regulationId: integer("regulation_id").references(() => regulations.id),
  policyId: integer("policy_id").references(() => policies.id),
  departmentId: integer("department_id").references(() => departments.id),
  status: text("status").notNull().default("대기중"), // "대기중", "분석중", "완료"
  findings: text("findings"),
  recommendations: text("recommendations"),

  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const analysisProgress = pgTable("analysis_progress", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").references(() => analyses.id),
  progress: integer("progress").notNull().default(0), // 0-100
  status: text("status").notNull(),
  steps: jsonb("steps").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).pick({
  name: true,
  code: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
});

export const insertRegulationSchema = createInsertSchema(regulations).pick({
  name: true,
  article: true,
  content: true,
  effectiveDate: true,
  priority: true,
  category: true,
});

export const insertPolicySchema = createInsertSchema(policies).pick({
  name: true,
  fileName: true,
  content: true,
  departmentId: true,
});

export const insertAnalysisSchema = createInsertSchema(analyses).pick({
  regulationId: true,
  policyId: true,
  departmentId: true,
  status: true,
  findings: true,
  recommendations: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  type: true,
  title: true,
  message: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type Regulation = typeof regulations.$inferSelect;
export type InsertRegulation = z.infer<typeof insertRegulationSchema>;

export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = z.infer<typeof insertPolicySchema>;

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;

export type AnalysisProgress = typeof analysisProgress.$inferSelect;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
