const {CosmosClient} = require("@azure/cosmos");
const yargs = require("yargs");
const fs = require("fs");

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
})
.help().argv;

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
    if (fs.existsSync("output")) {
        fs.rmSync("output", {recursive: true, force: true});
    }
    fs.mkdirSync("output");

    const stripCosmosProps = (doc) => {
        // bit clunky, but we don't want to include the cosmos specific fields
        delete doc._rid;
        delete doc._self;
        delete doc._etag;
        delete doc._attachments;
        delete doc._ts;
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
                        fs.writeFile(`output/${doc.id}.json`, JSON.stringify(doc), () => {
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