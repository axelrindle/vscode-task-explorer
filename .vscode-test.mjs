import { defineConfig } from '@vscode/test-cli'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
	files: 'out/test/**/*.js',
    workspaceFolder: join(__dirname, 'test/fixtures'),
    extensionDevelopmentPath: __dirname,
    platform: 'desktop',
})
