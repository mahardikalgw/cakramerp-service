import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  tableName(targetName: string, userSpecifiedName: string | undefined): string {
    return userSpecifiedName ?? this.toSnakeCase(targetName);
  }

  columnName(propertyName: string, customName: string | undefined, embeddedPrefixes: string[]): string {
    const name = customName ?? this.toSnakeCase(propertyName);
    return embeddedPrefixes.length ? embeddedPrefixes.join('_') + '_' + name : name;
  }

  relationName(propertyName: string): string {
    return this.toSnakeCase(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return this.toSnakeCase(relationName) + '_' + referencedColumnName;
  }

  joinTableName(firstTableName: string, secondTableName: string, firstPropertyName: string): string {
    return `${firstTableName}_${this.toSnakeCase(firstPropertyName)}_${secondTableName}`;
  }

  joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return `${tableName}_${columnName ?? this.toSnakeCase(propertyName)}`;
  }

  private toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, (match, p1, offset) => {
      return (offset > 0 ? '_' : '') + p1.toLowerCase();
    });
  }
}
