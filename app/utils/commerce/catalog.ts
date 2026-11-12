import type { BusinessState, Customer, Product } from "../../types/index.ts";
export function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (/^55\d{10,11}$/.test(digits)) digits = digits.slice(2);
  if (!/^\d{10,11}$/.test(digits))
    throw Error("Informe um telefone brasileiro com DDD.");
  return digits;
}
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value + "T12:00:00Z")) &&
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value
  );
}
export function validateCustomer(customers: Customer[], input: Customer) {
  const phone = normalizePhone(input.phone);
  if (!input.name.trim() || input.name.trim().length > 120)
    throw Error("Informe o nome do cliente com até 120 caracteres.");
  if (!input.id && !input.birthday)
    throw Error("Informe a data de aniversário.");
  if (
    input.birthday &&
    (!validDate(input.birthday) ||
      input.birthday > new Date().toLocaleDateString("sv-SE"))
  )
    throw Error("Informe uma data de nascimento válida.");
  if (
    customers.some((c) => {
      if (c.id === input.id) return false;
      try {
        return normalizePhone(c.phone) === phone;
      } catch {
        return false;
      }
    })
  )
    throw Error("Este telefone já pertence a outro cliente.");
  return { ...input, name: input.name.trim(), phone };
}
export function validateProduct(state: BusinessState, input: Product) {
  if (!input.name.trim() || input.name.trim().length > 120)
    throw Error("Informe o nome do produto com até 120 caracteres.");
  if (
    input.sku.trim() &&
    state.products.some(
      (p) =>
        p.id !== input.id &&
        p.sku.trim().toLowerCase() === input.sku.trim().toLowerCase(),
    )
  )
    throw Error("Esse SKU já está em uso.");
  if (
    ![input.costPrice, input.salePrice, input.stock, input.minimumStock].every(
      (n) => Number.isFinite(n) && n >= 0,
    ) ||
    !Number.isInteger(input.stock) ||
    !Number.isInteger(input.minimumStock)
  )
    throw Error("Confira preços e quantidades.");
  if (input.imageUrl && !/^https?:\/\//i.test(input.imageUrl))
    throw Error("Use uma URL de imagem http ou https.");
  return {
    ...input,
    name: input.name.trim(),
    sku: input.sku.trim(),
    description: input.description || "",
  };
}

export function recoverDemoCustomer(
  demoMode: boolean,
  customers: Customer[],
  phone: string,
  code: string,
): Customer {
  if (!demoMode)
    throw Error(
      "A recuperação de cadastro não está disponível neste ambiente.",
    );
  if (code !== "123456") throw Error("Confira o código de acesso informado.");
  const normalized = normalizePhone(phone);
  const matches = customers.filter((candidate) => {
    try {
      return normalizePhone(candidate.phone) === normalized;
    } catch {
      return false;
    }
  });
  if (matches.length > 1)
    throw Error(
      "Há mais de um cadastro com esse telefone. Peça à gestora para corrigir os registros.",
    );
  const customer = matches[0];
  if (!customer)
    throw Error("Cadastro não encontrado. Preencha seus dados para continuar.");
  return { ...customer };
}
