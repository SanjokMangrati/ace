export interface KeyVault {
  seal(secret: string): string
  open(sealed: string): string
}
