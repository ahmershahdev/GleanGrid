<x-mail::layout>
<x-slot:header>
<x-mail::header :url="config('app.url')">
{{ config('app.name') }}
</x-mail::header>
</x-slot:header>

{!! $slot !!}

@isset($subcopy)
<x-slot:subcopy>
<x-mail::subcopy>
{!! $subcopy !!}
</x-mail::subcopy>
</x-slot:subcopy>
@endisset

<x-slot:footer>
<x-mail::footer>
You’re receiving this because of activity on your GleanGrid account. We only send order, account and security e-mails — never marketing.

© {{ date('Y') }} GleanGrid — crafted by Syed Ahmer Shah.
</x-mail::footer>
</x-slot:footer>
</x-mail::layout>
