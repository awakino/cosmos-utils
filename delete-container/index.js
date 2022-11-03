const {CosmosClient} = require("@azure/cosmos");
const yargs = require("yargs");

const argv = yargs.option('database', {
    alias: 'd',
    description: "The Cosmos database that contains the container to delete",
    type: 'string'
}).option('container', {
    alias: 'c',
    description: "The Cosmos container to delete",
    type: "string"
}).option('account', {
    alias: "a",
    description: "Connection string to Cosmos DB account including access key",
    type: "string"
}).option('allow-self-signed', {
    description: "Allow the use of self-signed certificates when connecting to Cosmos DB",
    type: "boolean"
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

    console.log(`deleting container ${argv.container} from database ${argv.database}...`);
    await container.delete();
    console.log(`container ${argv.container} has been deleted`);
}

main().catch((error) => {
    console.error(error);
});