<x-mail::layout>
{{-- Header --}}
<x-slot:header>
<x-mail::header :url="config('app.url')">
{{ config('app.name') }}
</x-mail::header>
</x-slot:header>

{{-- Body --}}
{!! $slot !!}

{{-- Subcopy --}}
@isset($subcopy)
<x-slot:subcopy>
<x-mail::subcopy>
{!! $subcopy !!}
</x-mail::subcopy>
</x-slot:subcopy>
@endisset

{{-- Footer --}}
<x-slot:footer>
<x-mail::footer>
You’re receiving this because you have a GleanGrid account. Security e-mails are always sent, whatever your preferences.

© {{ date('Y') }} GleanGrid — crafted by Syed Ahmer Shah.
</x-mail::footer>
</x-slot:footer>
</x-mail::layout>
