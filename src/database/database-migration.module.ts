import { DataSource, DataSourceOptions } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import * as dotenv from 'dotenv'

import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../../.env') })
const configService = new ConfigService()

export const AppDataSource: DataSourceOptions = {
    type: 'mysql',
    host: configService.getOrThrow('MYSQL_HOST'),
    port: configService.getOrThrow('MYSQL_PORT'),
    database: configService.getOrThrow('MYSQL_DB'),
    username: configService.getOrThrow('MYSQL_USERNAME'),
    password: configService.getOrThrow('MYSQL_PASSWORD'),
    synchronize: configService.getOrThrow('SYNCHRONIZE'),
    dropSchema: configService.getOrThrow('DROP_SCHEME'),
    migrations: ['migrations/*.ts'],
    entities: [ '../modules/**/*.entity.ts'],
    logging: 'all',
    logger: 'advanced-console'
}

const dataSource = new DataSource(AppDataSource)
export default dataSource