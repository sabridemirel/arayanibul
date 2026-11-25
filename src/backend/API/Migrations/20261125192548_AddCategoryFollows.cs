using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryFollows : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "FollowersNotifiedAt",
                table: "Needs",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EnableNewNeedEmails",
                table: "AspNetUsers",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "NewNeedEmailCount",
                table: "AspNetUsers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "NewNeedEmailDay",
                table: "AspNetUsers",
                type: "timestamp with time zone",
                nullable: true);

            // Listings that are already live must not be announced as "new".
            migrationBuilder.Sql("UPDATE \"Needs\" SET \"FollowersNotifiedAt\" = NOW();");

            migrationBuilder.CreateTable(
                name: "CategoryFollows",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    CategoryId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CategoryFollows", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CategoryFollows_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CategoryFollows_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CategoryFollows_CategoryId",
                table: "CategoryFollows",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_CategoryFollows_UserId_CategoryId",
                table: "CategoryFollows",
                columns: new[] { "UserId", "CategoryId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CategoryFollows");

            migrationBuilder.DropColumn(
                name: "FollowersNotifiedAt",
                table: "Needs");

            migrationBuilder.DropColumn(
                name: "EnableNewNeedEmails",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "NewNeedEmailCount",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "NewNeedEmailDay",
                table: "AspNetUsers");
        }
    }
}
