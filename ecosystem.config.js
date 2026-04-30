module.exports = {
apps : [{
	name: "fraBering",
	script: "/home/andy/fraBering/dist/server",
    node_args: "--max-old-space-size=4096",
	env: {
		NODE_ENV: "production"
	}
}]
};