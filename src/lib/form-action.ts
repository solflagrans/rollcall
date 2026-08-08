export type FormActionResult =
  | { status: "success"; redirectTo: string }
  | { status: "error"; formError: string; fieldErrors?: Record<string, string> };
