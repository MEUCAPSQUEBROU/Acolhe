export const normalize = (value = "") => (value ?? "").toString().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const slugify = (value) => normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "animal";
