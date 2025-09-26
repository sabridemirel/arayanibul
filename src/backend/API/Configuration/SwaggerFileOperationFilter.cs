using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace API.Configuration;

public class SwaggerFileOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var fileUploadMime = "multipart/form-data";
        if (operation.RequestBody?.Content?.ContainsKey(fileUploadMime) == true)
        {
            var properties = operation.RequestBody.Content[fileUploadMime].Schema.Properties;
            foreach (var parameter in context.ApiDescription.ParameterDescriptions)
            {
                if (parameter.Type == typeof(IFormFile))
                {
                    if (properties.ContainsKey(parameter.Name))
                    {
                        properties[parameter.Name] = new OpenApiSchema
                        {
                            Type = "string",
                            Format = "binary"
                        };
                    }
                }
            }
        }
    }
}