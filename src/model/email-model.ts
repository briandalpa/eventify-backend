export type EmailOptions = {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
};
