const {CosmosClient} = require("@azure/cosmos");
const yargs = require("yargs");
const fs = require("fs");
const {CosmosEntityFields} = require("../common/constants");

const argv = yargs.option('database', {
    alias: 'd',
    description: "The Cosmos database to query",
    type: 'string'
}).option('container', {
    alias: 'c',
    description: "The Cosmos container to query",
    type: "string"
}).option('account', {
    alias: "a",
    description: "Connection string to Cosmos DB account including access key",
    type: "string"
}).option('allow-self-signed', {
    description: "Allow the use of self-signed certificates when connecting to Cosmos DB",
    type: "boolean"
}).options('output', {
    alias: "o",
    description: "Output folder files will be written to. If ommitted files will be written to <pwd>/output",
    type: "string",
    default: "output"
})
.help().argv;

if (argv.allowSelfSigned) {
    // allow self-signed certificates
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
const client = new CosmosClient(argv.account);

async function main() {
    const {database} = await client.database(argv.database).read();
    if (!database) {
        throw new Error(`Specified database ${argv.database} does not exist`);
    }

    const {container} = await database.container(argv.container).read();
    if (!container) {
        throw new Error(`Specified container ${argv.container} does not exist in database ${argv.database}`);
    }

    // create the output folder
    if (fs.existsSync(argv.output)) {
        fs.rmSync(argv.output, {recursive: true, force: true});
    }
    fs.mkdirSync(argv.output);

    const stripCosmosProps = (doc) => {
        // bit clunky, but we don't want to include the cosmos specific fields
        CosmosEntityFields.forEach(f => delete doc[f]);
    };

    // read all, but fetch in batches
    const iterator = container.items.readAll();
    while (iterator.hasMoreResults()) {
        const {resources} = await iterator.fetchNext()
        if (resources.length > 0) {
            console.log(`Fetched ${resources.length} documents`);
            
            const tasks = [];
            resources.forEach((doc) => {
                tasks.push(new Promise((resolve, reject) => {
                    try {
                        stripCosmosProps(doc);
                        fs.writeFile(`${argv.output}/${doc.id}.json`, JSON.stringify(doc), () => {
                            resolve();
                        });
                    } catch (error) {
                        reject(error);
                    }
                }));
            });

            await Promise.all(tasks);
            console.log("Batch complete - checking for more documents");
        }
    }

    console.log(`All documents exported to file`);
}

main().catch((err) => {
    console.error(`Failed to export documents: ${err}`);
});