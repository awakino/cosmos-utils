const {CosmosClient} = require("@azure/cosmos");
const yargs = require("yargs");
const fs = require("fs");
const path = require("path");

const argv = yargs.option('database', {
    alias: 'd',
    description: "The Cosmos database to upload to",
    type: 'string'
}).option('container', {
    alias: 'c',
    description: "The Cosmos container to upload to",
    type: "string"
}).option('account', {
    alias: "a",
    description: "Connection string to Cosmos DB account including access key",
    type: "string"
}).option('allow-self-signed', {
    description: "Allow the use of self-signed certificates when connecting to Cosmos DB",
    type: "boolean"
}).options('source', {
    alias: "s",
    description: "Source folder to upload from.",
    type: "string"
}).options('encoding', {
    alias: 'e',
    description: "The encoding to use when reading source files",
    type: "string",
    default: "utf8"
})
.help().argv;

if (argv.allowSelfSigned) {
    // allow self-signed certificates
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
const client = new CosmosClient(argv.account);

async function main() {
    const {database} = await client.databases.createIfNotExists({
        id: argv.database
    });

    const {container} = await database.containers.createIfNotExists({
        id: argv.container,
        partitionKey: "/id"
    });

    const files = fs.readdirSync(argv.source);
    console.log(`Uploading ${files.length} files to Cosmos DB`);

    files.forEach(async (f) => {
        // readdir only gives us the filename
        const filename = path.resolve(argv.source, f);
        if (path.extname(filename) !== ".json") {
            console.warn(`The file ${f} does not have a .json file extension. It will be skipped`);
            return;
        }

        // read the file
        const data = fs.readFileSync(filename);
        try {
            // convert first to a string, and then to an object
            const doc = JSON.parse(data.toString(argv.encoding));

            // upload to cosmos using the ID field as the partition key
            await container.items.create(doc, {partitionKey: doc.id});
            console.log(`${f}`);
        } catch {
            console.error(`Error parsing file ${f}. Check that file contains valid JSON`);
            return;
        }
    });

    console.log("File upload complete");
}

main().catch((err) => console.error(err));