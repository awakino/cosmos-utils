const {CosmosClient} = require("@azure/cosmos");
const yargs = require("yargs");

const argv = yargs.option('account', {
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
    console.log("| Database            | Container           |");
    console.log(" ------------------------------------------- ")
    const query = client.databases.readAll();
    while (query.hasMoreResults()) {
        const {resources: databases} = await query.fetchNext();
        databases.forEach(async (db) => {
            const dbString = db.id.length <= 20 ? db.id.padEnd(20) : db.id.substring(0, 20);

            const {resources: containers} = 
                await client.database(db.id).containers.readAll().fetchAll();

            containers.forEach((c) => {
                const ctString = c.id.length <= 20 ? c.id.padEnd(20) : db.id.substring(0, 20);
                console.log(`| ${dbString}| ${ctString}|`);
            });
        });
    }
}

main().catch((error) => {
    console.error(error);
});