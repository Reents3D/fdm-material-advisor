/** JSON Schema validation for every data file. Fails CI on any violation. */
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const TARGETS = [
  { dir: "data/materials", schema: "schema/material.schema.json" },
  { dir: "data/products", schema: "schema/product.schema.json" },
  { dir: "data/usecases", schema: "schema/usecase.schema.json" },
];

/* Einzeldateien mit eigenem Schema. Ohne diesen Block waeren chemical.schema.json und
   glossary.schema.json reine Dekoration - geschrieben, aber nie angewendet. */
const SINGLE = [
  { file: "data/chemicals.json", schema: "schema/chemical.schema.json" },
  { file: "data/glossary.json", schema: "schema/glossary.schema.json" },
];

let failed = 0;
let checked = 0;

for (const target of TARGETS) {
  const schemaPath = path.join(ROOT, target.schema);
  const dir = path.join(ROOT, target.dir);
  if (!existsSync(schemaPath) || !existsSync(dir)) continue;

  const validate = ajv.compile(JSON.parse(readFileSync(schemaPath, "utf8")));

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const data = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
    checked++;
    if (validate(data)) continue;
    failed++;
    console.log(`FAIL  ${target.dir}/${file}`);
    for (const e of validate.errors) {
      console.log(`      ${e.instancePath || "/"} ${e.message} ${JSON.stringify(e.params)}`);
    }
  }
}

for (const target of SINGLE) {
  const schemaPath = path.join(ROOT, target.schema);
  const filePath = path.join(ROOT, target.file);
  if (!existsSync(schemaPath) || !existsSync(filePath)) continue;
  const validate = ajv.compile(JSON.parse(readFileSync(schemaPath, "utf8")));
  const data = JSON.parse(readFileSync(filePath, "utf8"));
  checked++;
  if (validate(data)) continue;
  failed++;
  console.log(`FAIL  ${target.file}`);
  for (const e of validate.errors) {
    console.log(`      ${e.instancePath || "/"} ${e.message} ${JSON.stringify(e.params)}`);
  }
}

console.log(
  failed
    ? `\n${failed} von ${checked} Dateien verletzen das Schema.`
    : `\nSchema: ${checked} Dateien gueltig.`,
);
process.exit(failed ? 1 : 0);
