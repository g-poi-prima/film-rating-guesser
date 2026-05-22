{
  description = "Film Rating Guessr - Server dev shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      pe = pkgs.prisma-engines;
    in {
      devShells.${system}.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          nodejs
          openssl
          prisma-engines
        ];

        PRISMA_SCHEMA_ENGINE_BINARY = "${pe}/bin/schema-engine";
        PRISMA_QUERY_ENGINE_BINARY = "${pe}/bin/query-engine";
        PRISMA_QUERY_ENGINE_LIBRARY = "${pe}/lib/libquery_engine.node";
        PRISMA_FMT_BINARY = "${pe}/bin/prisma-fmt";
        PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = "1";
      };
    };
}
