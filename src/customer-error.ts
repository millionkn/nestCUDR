export class CustomerError extends Error {
  constructor(message: any) {
    super(message);
    if (typeof message === 'object') {
      this.messageBody = message;
    } else {
      this.messageBody = { message };
    }

  }

  messageBody: object
}