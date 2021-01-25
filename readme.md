
## ts-transform-runtime-check
POC idea of generating code to type check values at runtime.  
The library provides the `is<T>(value: unkown): value is T` function to be used whenever a type needs to be validated at runtime.  
This compiler plugin will generate the code that asserts the type thus providing type safety beyond compile time.

An example program
```ts
import { is } from 'ts-transform-runtime-check'

interface User {
    id: number;
    name: string;
    age: number;
}

fetchData().then((data: any) => {
    if (!is<User>(data)) {
        return Promise.reject('invalid data');
    }
    // `user` is conforming the `User` interface at compile and runtime
    alert(`welcome ${user.name}`);
});

```

### Using the Typescript compiler API
The plugin currently uses `ttypescript` to hook into the typescript compiler as the current typescript compiler does not allow for plugins at the moment. The plugin uses a `.d.ts` file to define the ambient module `'ts-transform-runtime-check'`. The user can import functions from this ambient module as if it were a normal library.

Whenever a program is compiled `ttypescript` asks each transformer package for its default export and invokes it with the typescript program and expects a factory function to generate context transformer functions. These context transformer functions themself generate source file visitor functions. It gets a bit weird with the factory pattern, but once we are at the `SourceFile` node we are at the actual ast transformation.

The package pretends its a normal library that you can import but besides the generated code there is no actual runtime code imported. Because of this we look for import declarations for our package and remove those from the source files. To figure out where the package functions are called we ask the `TypeChecker` for a list of all the ambient modules and try to find the one defined by this package. It then maps the exported functions to an `CallExpressionNode` transformer function. These `CallExpressionNode` transformer functions are responsible for taking a `CallExpressionNode` transform it into typescript code that implements the expected behaviour. This allows for the typescript code `is<number>(2)` to look like a function call, but it actually gets transformed into code that implements the same behaviour. By using the `TypeChecker` to figure out when our package functions are called using aliased imports works just as expected.

To catch users assigning our package functions to other variables and/or properties  we can visit `VariableDeclaration` and `PropertyAssignment` nodes and replace the values with `noop` functions.
