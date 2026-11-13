using System.Text.Json;
using System.Text.Json.Serialization;

namespace API.Configuration;

/// <summary>
/// Serializes enums as their names ("Active", "Pending"), which is what the web and mobile
/// clients compare against. [Flags] enums (e.g. VerificationBadges) stay numeric because the
/// clients treat them as bit masks. Numeric values are still accepted on input.
/// </summary>
public sealed class StringEnumExceptFlagsConverter : JsonConverterFactory
{
    private readonly JsonStringEnumConverter _inner = new();

    public override bool CanConvert(Type typeToConvert)
    {
        var enumType = Nullable.GetUnderlyingType(typeToConvert) ?? typeToConvert;
        return enumType.IsEnum && !enumType.IsDefined(typeof(FlagsAttribute), inherit: false);
    }

    public override JsonConverter? CreateConverter(Type typeToConvert, JsonSerializerOptions options)
        => _inner.CreateConverter(typeToConvert, options);
}
