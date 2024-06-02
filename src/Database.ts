import fs from "node:fs";
import path from "node:path";
import mysql, { type Connection } from "mysql2/promise";
import mysqldump, { type DumpReturn } from "mysqldump";
import type { WPMMconfig } from "./types.js";
import { getConnectionSettings } from "./utils/data.js";

/**
 * Constructor for the Database class.
 *
 * @class Database
 */
export class Database {
	/** The configuration object. */
	protected config: WPMMconfig;

	/**
	 * Creates an instance of the Database class.
	 *
	 * @param config - The configuration object.
	 */
	constructor(config: WPMMconfig) {
		// Load configuration from wp-package.json
		this.config = config;
	}

	/**
	 * Generates a unique filename for the database dump.
	 *
	 * @returns The generated filename.
	 */
	dbDumpFilename = (): string => {
		const date = new Date().toDateString().replace(" ", "-");
		return `${this.config.wordpress.WP_config.DB_NAME}-${date}.sql.gz`;
	};

	/**
	 * Uploads a database by executing SQL queries from a specified file.
	 *
	 * @async
	 * @param sqlFilePath - The path to the SQL file.
	 * @return A Promise that resolves to a MySQL Connection object or throws an Error.
	 */
	async uploadDatabase(sqlFilePath: string): Promise<boolean | Error> {
		try {
			console.log("Uploading database...");

			if (!fs.existsSync(sqlFilePath)) {
				return new Error("SQL file not found");
			}

			if (!this.config) {
				return new Error("Database configuration not found");
			}

			/**
			 * the connection settings for the database
			 * @type databaseConnectionConfig - The connection settings for the database.
			 */
			const databaseConnectionConfig: mysql.ConnectionOptions =
				getConnectionSettings(this.config.wordpress.WP_config);

			/**
			 * @type {import('mysql2/promise').Connection} connection - The MySQL connection object.
			 */
			const connection: Connection = await mysql.createConnection(
				databaseConnectionConfig,
			);

			const sqlFileContent = fs.readFileSync(sqlFilePath, "utf8");
			const queries = sqlFileContent.split(";");

			for (const query of queries) {
				if (query.trim() !== "") {
					await connection.query(query);
				}
			}

			console.log("Database uploaded successfully");
			return connection
				.end()
				.then(() => {
					console.log("👍 Database connection closed");
					return true;
				})
				.catch((error) => {
					console.error("🫠 Error closing database connection:", error.message);
					throw new Error(
						`Error updating plugins: ${(error as Error).message}`,
					);
				});
		} catch (error: unknown) {
			throw new Error(`Error updating plugins: ${(error as Error).message}`);
		}
	}

	/**
	 * Asynchronously dumps the database to the specified output file.
	 *
	 * @param basePath - The base path of the WordPress installation.
	 * @async
	 * @return A promise that resolves if the database is dumped successfully, or rejects with an error message if an error occurs.
	 */
	async dumpDatabase(basePath: string): Promise<Error | boolean> {
		const dumpPath = path.join(basePath, "backups", "db");
		const dumpFile = path.join(dumpPath, this.dbDumpFilename());

		// Check if the directory exists and create it if it doesn't
		if (!fs.existsSync(dumpPath)) {
			fs.mkdirSync(dumpPath, { recursive: true });
			console.log(`i Directory created: ${dumpPath}`);
		}

		console.log(`✳ Dumping database to ${dumpFile}...`);

		if (!this.config.wordpress.WP_config) {
			return new Error("🔴 Database configuration not found");
		}

		/**
		 * the connection settings for the database
		 *
		 * @type databaseConnectionConfig - The connection settings for the database.
		 */
		const databaseConnectionConfig: mysqldump.ConnectionOptions =
			getConnectionSettings(this.config.wordpress.WP_config);

		if (databaseConnectionConfig.host === "localhost") {
			console.log(
				"! Warning: You are using localhost as your database host. This may not work correctly.",
			);
		}

		return await mysqldump
			.default({
				connection: databaseConnectionConfig,
				dumpToFile: dumpFile,
				compressFile: true,
			})
			.then((res: DumpReturn) => {
				console.log(`✅ Database dumped to ${dumpFile}`);
				console.log(res);

				return true;
			})
			.catch((error: unknown) => {
				console.error("🔴 Error dumping database:", (error as Error).message);
				return new Error((error as Error).message);
			});
	}
}
