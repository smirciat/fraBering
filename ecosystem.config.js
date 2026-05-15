module.exports = {
apps : [{
	name: "fraBering",
	script: "/home/andy/fraBering/dist/server",
	interpreter: "/home/andy/.nvm/versions/node/v12.22.12/bin/node",
    node_args: "--max-old-space-size=4096",
	env: {
		NODE_ENV: "production"
	}
}]
};