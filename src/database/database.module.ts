import { Module, OnModuleInit } from "@nestjs/common"
import { ConfigService } from '@nestjs/config'
import { TypeOrmModule } from "@nestjs/typeorm"
import { DataSource } from "typeorm";

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            useFactory: (configService : ConfigService) => ({
                type: 'mysql',
                host: configService.getOrThrow('MYSQL_HOST'),
                port: configService.getOrThrow('MYSQL_PORT'),
                database: configService.getOrThrow('MYSQL_DB'),
                username: configService.getOrThrow('MYSQL_USERNAME'),
                password: configService.getOrThrow('MYSQL_PASSWORD'),
                autoLoadEntities: true,
                migrations: [__dirname + '/../../migrations/*.js'],
                synchronize: false,
                logging: 'all',
                logger: 'advanced-console'
            }),
            
            inject: [ConfigService]
        }),
    ],
})

export class DatabaseModule implements OnModuleInit {
    constructor(private dataSource: DataSource) {}
  
    async onModuleInit() {
      console.log('Running migrations...')
      if (!this.dataSource.isInitialized) {
        console.error('DataSource is not initialized. Skipping migrations.')
        return
      }
      try {
        await this.dataSource.runMigrations();
        console.log('Migrations have been successfully executed.')
      } catch (error) {
        console.error('Error during migration execution:', error)
      }
    }
  }