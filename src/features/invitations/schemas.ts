import { z } from "zod";

export const rollcallIdSchema = z
  .string()
  .trim()
  .regex(/^rc_[A-Za-z0-9_-]{16}$/u, "Введите корректный Rollcall ID.");

export const invitationReferenceSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{12}$/u, "Некорректное приглашение.");

export const inviteTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/u, "Некорректная ссылка-приглашение.");
