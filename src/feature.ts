import { buildFeature, FeatureType, Filter, ValidationError } from 'admin-bro';
import { Importer, Parsers } from './parsers';
import fs from 'fs';
import util from 'util';
import { jsonImporter } from './modules/json/json.importer';
import { csvImporter } from './modules/csv/csv.importer';
import { xmlImporter } from './modules/xml/xml.importer';
import { bundleComponents } from './components/bundleComponents';

const readFile = util.promisify(fs.readFile);

const { EXPORT_COMPONENT, IMPORT_COMPONENT } = bundleComponents();

const feature = (): FeatureType => {
  return buildFeature({
    actions: {
      export: {
        handler: async (request, response, context) => {
          if (request.method === 'post') {
            const parser = Parsers[request.query?.type ?? 'json'].export;
            const records = await context.resource.find(
              new Filter({}, context.resource),
              {
                limit: Number.MAX_SAFE_INTEGER,
              }
            );
            const parsedData = parser(records);

            return {
              exportedData: parsedData,
            };
          }
          return {};
        },
        component: EXPORT_COMPONENT,
        actionType: 'resource',
      },
      import: {
        handler: async (request, response, context) => {
          if (request.method === 'post') {
            const file = request.payload?.file;
            const filePath = file?.path;

            if (!filePath) {
              throw new ValidationError({
                file: { message: 'No file uploaded' },
              });
            }
            const importer = getImporterByFileName(file.name);

            const fileContent = await readFile(filePath);
            await importer(fileContent.toString(), context.resource);
          }
          return {};
        },
        component: IMPORT_COMPONENT,
        actionType: 'resource',
      },
    },
  });
};

export const getImporterByFileName = (fileName: string): Importer => {
  if (fileName.includes('.json')) {
    return jsonImporter;
  }
  if (fileName.includes('.csv')) {
    return csvImporter;
  }
  if (fileName.includes('.xml')) {
    return xmlImporter;
  }
  throw new Error('No parser found');
};

export default feature;
