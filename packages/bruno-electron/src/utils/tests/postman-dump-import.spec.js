const AdmZip = require('adm-zip');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { postmanToBruno, postmanToBrunoEnvironment } = require('@usebruno/converters');

/**
 * These tests verify the Postman data dump ZIP detection and extraction logic
 * used by the renderer:is-postman-dump-zip and renderer:extract-postman-dump-zip IPC handlers.
 */

const createPostmanDumpZip = (options = {}) => {
  const {
    rootFolder = 'test-dump-uuid',
    collections = [],
    environments = [],
    includeArchive = true
  } = options;

  const zip = new AdmZip();

  if (includeArchive) {
    const archive = {
      collection: {},
      environment: {}
    };
    collections.forEach((c) => { archive.collection[c.id || 'test-id'] = true; });
    environments.forEach((e) => { archive.environment[e.id || 'test-id'] = true; });
    zip.addFile(`${rootFolder}/archive.json`, Buffer.from(JSON.stringify(archive)));
  }

  collections.forEach((col, i) => {
    const id = col.id || `col-${i}`;
    const data = {
      info: {
        _postman_id: id,
        name: col.name || `Test Collection ${i}`,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: col.items || []
    };
    zip.addFile(`${rootFolder}/collection/${id}.json`, Buffer.from(JSON.stringify(data)));
  });

  environments.forEach((env, i) => {
    const id = env.id || `env-${i}`;
    const data = {
      id,
      name: env.name || `Test Environment ${i}`,
      values: env.values || [{ key: 'baseUrl', value: 'http://localhost', enabled: true, type: 'default' }]
    };
    zip.addFile(`${rootFolder}/environment/${id}.json`, Buffer.from(JSON.stringify(data)));
  });

  const tmpPath = path.join(os.tmpdir(), `test-postman-dump-${Date.now()}.zip`);
  zip.writeZip(tmpPath);
  return tmpPath;
};

const createBrunoCollectionZip = () => {
  const zip = new AdmZip();
  zip.addFile('bruno.json', Buffer.from(JSON.stringify({ name: 'Test', version: '1' })));
  zip.addFile('request.bru', Buffer.from('meta { name: test }'));

  const tmpPath = path.join(os.tmpdir(), `test-bruno-zip-${Date.now()}.zip`);
  zip.writeZip(tmpPath);
  return tmpPath;
};

// Detection logic (mirrors renderer:is-postman-dump-zip)
const isPostmanDumpZip = (zipFilePath) => {
  try {
    const zip = new AdmZip(zipFilePath);
    const entries = zip.getEntries().map((e) => e.entryName);

    const hasCollectionDir = entries.some((name) => /^[^/]+\/collection\//.test(name));
    const hasArchiveJson = entries.some((name) => /^[^/]+\/archive\.json$/.test(name));

    return hasCollectionDir && hasArchiveJson;
  } catch {
    return false;
  }
};

describe('Postman Data Dump Import', () => {
  const tmpFiles = [];

  afterAll(() => {
    tmpFiles.forEach((f) => {
      try {
        fs.unlinkSync(f);
      } catch {
        // ignore cleanup errors
      }
    });
  });

  describe('isPostmanDumpZip detection', () => {
    it('should detect a valid Postman dump ZIP', () => {
      const zipPath = createPostmanDumpZip({
        collections: [{ name: 'API Collection', id: 'col-1' }],
        environments: [{ name: 'Dev Env', id: 'env-1' }]
      });
      tmpFiles.push(zipPath);

      expect(isPostmanDumpZip(zipPath)).toBe(true);
    });

    it('should detect a dump with only collections (no environments)', () => {
      const zipPath = createPostmanDumpZip({
        collections: [{ name: 'API', id: 'col-1' }],
        environments: []
      });
      tmpFiles.push(zipPath);

      expect(isPostmanDumpZip(zipPath)).toBe(true);
    });

    it('should reject a Bruno collection ZIP', () => {
      const zipPath = createBrunoCollectionZip();
      tmpFiles.push(zipPath);

      expect(isPostmanDumpZip(zipPath)).toBe(false);
    });

    it('should reject a ZIP without archive.json', () => {
      const zipPath = createPostmanDumpZip({
        collections: [{ name: 'API', id: 'col-1' }],
        includeArchive: false
      });
      tmpFiles.push(zipPath);

      expect(isPostmanDumpZip(zipPath)).toBe(false);
    });

    it('should return false for non-existent file', () => {
      expect(isPostmanDumpZip('/tmp/nonexistent-file.zip')).toBe(false);
    });
  });

  describe('Postman dump extraction', () => {
    it('should extract and convert collections from dump ZIP', async () => {
      const zipPath = createPostmanDumpZip({
        collections: [
          { name: 'Users API', id: 'col-users', items: [
            { name: 'Get Users', request: { method: 'GET', url: { raw: 'https://api.example.com/users' } } }
          ] },
          { name: 'Orders API', id: 'col-orders', items: [] }
        ],
        environments: [
          { name: 'Production', id: 'env-prod', values: [
            { key: 'baseUrl', value: 'https://api.example.com', enabled: true, type: 'default' },
            { key: 'apiKey', value: 'secret-key', enabled: true, type: 'secret' }
          ] }
        ]
      });
      tmpFiles.push(zipPath);

      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries();

      const collectionEntries = entries.filter(
        (e) => !e.isDirectory && /^[^/]+\/collection\/[^/]+\.json$/.test(e.entryName)
      );
      const environmentEntries = entries.filter(
        (e) => !e.isDirectory && /^[^/]+\/environment\/[^/]+\.json$/.test(e.entryName)
      );

      expect(collectionEntries.length).toBe(2);
      expect(environmentEntries.length).toBe(1);

      // Convert collections
      const collections = [];
      for (const entry of collectionEntries) {
        const rawJson = JSON.parse(entry.getData().toString('utf8'));
        const brunoCollection = await postmanToBruno(rawJson, { useWorkers: false });
        collections.push(brunoCollection);
      }

      expect(collections.length).toBe(2);
      expect(collections.map((c) => c.name).sort()).toEqual(['Orders API', 'Users API']);
      collections.forEach((c) => {
        expect(c.uid).toBeDefined();
        expect(c.name).toBeDefined();
        expect(Array.isArray(c.items)).toBe(true);
      });

      // Convert environments
      const environments = [];
      for (const entry of environmentEntries) {
        const rawJson = JSON.parse(entry.getData().toString('utf8'));
        const brunoEnv = postmanToBrunoEnvironment(rawJson);
        brunoEnv.uid = brunoEnv.uid || rawJson.id;
        environments.push(brunoEnv);
      }

      expect(environments.length).toBe(1);
      expect(environments[0].name).toBe('Production');
      expect(environments[0].uid).toBe('env-prod');
      expect(environments[0].variables.length).toBe(2);
      expect(environments[0].variables[1].secret).toBe(true);
    });

    it('should handle malformed collection JSON gracefully', async () => {
      const zip = new AdmZip();
      zip.addFile('dump/archive.json', Buffer.from(JSON.stringify({ collection: {}, environment: {} })));
      zip.addFile('dump/collection/bad.json', Buffer.from('{ invalid json'));
      zip.addFile('dump/collection/good.json', Buffer.from(JSON.stringify({
        info: { name: 'Good API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
        item: []
      })));

      const tmpPath = path.join(os.tmpdir(), `test-malformed-${Date.now()}.zip`);
      zip.writeZip(tmpPath);
      tmpFiles.push(tmpPath);

      const entries = new AdmZip(tmpPath).getEntries();
      const collEntries = entries.filter(
        (e) => !e.isDirectory && /^[^/]+\/collection\/[^/]+\.json$/.test(e.entryName)
      );

      const collections = [];
      const errors = [];
      for (const entry of collEntries) {
        try {
          const rawJson = JSON.parse(entry.getData().toString('utf8'));
          const brunoCollection = await postmanToBruno(rawJson, { useWorkers: false });
          collections.push(brunoCollection);
        } catch (err) {
          errors.push({ file: path.basename(entry.entryName), error: err.message });
        }
      }

      expect(collections.length).toBe(1);
      expect(collections[0].name).toBe('Good API');
      expect(errors.length).toBe(1);
      expect(errors[0].file).toBe('bad.json');
    });
  });
});
