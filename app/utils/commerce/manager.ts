export function authenticateDemoManager(email: string, password: string) {
  if (
    email.trim().toLowerCase() !== "gestora@exemplo.test" ||
    password !== "Loja123456!"
  )
    throw Error("Confira o e-mail e a senha.");
  return {
    id: "manager-demo",
    name: "Marina Costa",
    email: "gestora@exemplo.test",
  };
}
