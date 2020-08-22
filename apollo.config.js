module.exports = {
  client: {
    service: {
      name: 'github',
      localSchemaFile: './schema.docs.graphql',
    },
    includes: ['src/app/**/*.graphql'],
  },
};
