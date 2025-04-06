import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Base user schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Chat message types for WebSocket communication
export const messageTypes = {
  JOIN: 'join',
  LEAVE: 'leave',
  TEXT_MESSAGE: 'text_message',
  FIND_PARTNER: 'find_partner',
  PARTNER_FOUND: 'partner_found',
  PARTNER_DISCONNECTED: 'partner_disconnected',
  ICE_CANDIDATE: 'ice_candidate',
  OFFER: 'offer',
  ANSWER: 'answer',
  ERROR: 'error',
  PING: 'ping',
  PONG: 'pong'
} as const;

// Zod schemas for message validation
export const textMessageSchema = z.object({
  type: z.literal(messageTypes.TEXT_MESSAGE),
  content: z.string().min(1).max(1000),
  timestamp: z.number()
});

export const iceCandiateSchema = z.object({
  type: z.literal(messageTypes.ICE_CANDIDATE),
  candidate: z.any() // ICE candidate data
});

export const offerSchema = z.object({
  type: z.literal(messageTypes.OFFER),
  offer: z.any() // SDP offer
});

export const answerSchema = z.object({
  type: z.literal(messageTypes.ANSWER),
  answer: z.any() // SDP answer
});

export const findPartnerSchema = z.object({
  type: z.literal(messageTypes.FIND_PARTNER),
  mode: z.enum(['text', 'video'])
});

export const partnerFoundSchema = z.object({
  type: z.literal(messageTypes.PARTNER_FOUND),
  partnerId: z.string()
});

export const partnerDisconnectedSchema = z.object({
  type: z.literal(messageTypes.PARTNER_DISCONNECTED)
});

export const joinSchema = z.object({
  type: z.literal(messageTypes.JOIN)
});

export const leaveSchema = z.object({
  type: z.literal(messageTypes.LEAVE)
});

export const errorSchema = z.object({
  type: z.literal(messageTypes.ERROR),
  message: z.string()
});

export const pingSchema = z.object({
  type: z.literal(messageTypes.PING)
});

export const pongSchema = z.object({
  type: z.literal(messageTypes.PONG)
});

// Create a union of all valid message types
export const messageSchema = z.discriminatedUnion('type', [
  textMessageSchema,
  iceCandiateSchema,
  offerSchema,
  answerSchema,
  findPartnerSchema,
  partnerFoundSchema,
  partnerDisconnectedSchema,
  joinSchema,
  leaveSchema,
  errorSchema,
  pingSchema,
  pongSchema
]);

export type ChatMessage = z.infer<typeof textMessageSchema>;
export type WebRTCMessage = z.infer<typeof iceCandiateSchema> | z.infer<typeof offerSchema> | z.infer<typeof answerSchema>;
export type SystemMessage = 
  | z.infer<typeof findPartnerSchema> 
  | z.infer<typeof partnerFoundSchema> 
  | z.infer<typeof partnerDisconnectedSchema>
  | z.infer<typeof joinSchema>
  | z.infer<typeof leaveSchema>
  | z.infer<typeof errorSchema>
  | z.infer<typeof pingSchema>
  | z.infer<typeof pongSchema>;

export type WsMessage = ChatMessage | WebRTCMessage | SystemMessage;
