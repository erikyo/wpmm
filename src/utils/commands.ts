import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/**
 * Installs npm packages in the specified package directory.
 *
 * @param {string} packageDirectory - The directory path where the package is located.
 * @return {Promise<void>} - A promise that resolves when the packages are installed and built.
 */
export async function installNpmPackages(
	packageDirectory: string,
): Promise<void> {
	const packageJsonPath = path.join(packageDirectory, "package.json");
	if (!fs.existsSync(packageJsonPath)) {
		// console.warn(`Local directory (${packageDirectory}) does not contain a package.json file.`)
		return;
	}
	const packageData = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
	const packageName = packageData.name;
	console.log(
		`🚀 Installing and building ${packageName} from local directory...`,
	);

	const packageLockPath = path.join(packageDirectory, "package-lock.json");
	let command = "npm i && npm run build";
	if (fs.existsSync(packageLockPath)) {
		command = "npm ci && npm run build";
	}

	await new Promise((resolve, reject) => {
		exec(command, { cwd: packageDirectory }, (error) => {
			if (error) {
				reject(error);
			} else {
				console.log(`📦 ${packageName} dependencies installed and built.`);
				resolve(true);
			}
		});
	});
}

/**
 * Installs composer dependencies and generates autoloader based on composer.json file.
 *
 * @param {string} repoPath - The path to the repository where composer.json is located.
 *
 * @returns {void} - A promise resolving when the installation process is completed.
 */
export function installComposer(repoPath: string): void {
	console.log("🎻 Found composer.json");
	exec("composer install --no-dev", { cwd: repoPath });
	exec("composer dumpautoload -o", { cwd: repoPath });
}

/**
 * Checks if WP-CLI is available.
 *
 * @return {boolean} - A promise that resolves to true if WP-CLI is available, false otherwise.
 */
export function isWPCLIAvailable(): boolean {
	try {
		// Attempt to execute a simple WP-CLI command
		exec("wp --version");
		return true; // If successful, WP-CLI is available
	} catch (error) {
		console.log(
			"🔴 WP-CLI is not available on this system. Please install WP-CLI and try again.",
		);
		console.log(
			"Read more about at https://make.wordpress.org/cli/handbook/guides/installing/",
		);
		return false; // If an error occurs, WP-CLI is not available
	}
}

/**
 * Runs post-install commands asynchronously.
 *
 * @param {string[]} commands - An array of WP-CLI commands to execute.
 * @return {Promise<void>} - A promise that resolves when the post-install commands complete.
 */
export async function runPostInstallCommands(
	commands: string[],
): Promise<void> {
	// Execute each post-install command
	for (const command of commands) {
		try {
			console.log(`Executing: ${command}`);
			const { stdout, stderr } = exec(command);
			if (stdout) {
				console.log(`Command output:\n${stdout}`);
			}
			if (stderr) {
				console.error(`Command error:\n${stderr}`);
			}
		} catch (error) {
			console.error(`Error executing command: ${command}`, error);
		}
	}
}

module.exports = {
	installNpmPackages,
	installComposer,
	isWPCLIAvailable,
	runPostInstallCommands,
};
