'use strict'

// El proveedor actual es autocontenido y no importa módulos externos, por lo
// que TypeScript puede transpilarlo directamente sin un paso de bundle.
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const ROOT = __dirname
const SRC_DIR = path.join(ROOT, 'src')
const OUT_DIR = path.join(ROOT, 'providers')

function buildProvider(name) {
  const entry = path.join(SRC_DIR, name, 'index.js')
  if (!fs.existsSync(entry)) throw new Error(`No se encontró el proveedor: ${entry}`)
  const source = fs.readFileSync(entry, 'utf8')
  if (/^\s*(?:import\s|export\s)|\brequire\s*\(/m.test(source)) {
    throw new Error('El proveedor ya no es autocontenido; revisa el build antes de compilarlo sin bundler.')
  }
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES5,
      module: ts.ModuleKind.CommonJS,
      downlevelIteration: true,
      removeComments: false
    },
    reportDiagnostics: true
  })
  const errors = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error)
  if (errors.length) {
    throw new Error(errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'))
  }
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const output = path.join(OUT_DIR, `${name}.js`)
  fs.writeFileSync(output, result.outputText, 'utf8')
  console.log(`✓ ${name} -> providers/${name}.js (${(result.outputText.length / 1024).toFixed(1)} KB)`)
}

const names = process.argv.slice(2).filter((x) => !x.startsWith('--'))
if (!names.length) names.push(...fs.readdirSync(SRC_DIR).filter((name) => fs.statSync(path.join(SRC_DIR, name)).isDirectory() && !name.startsWith('_')))
for (const name of names) buildProvider(name)
