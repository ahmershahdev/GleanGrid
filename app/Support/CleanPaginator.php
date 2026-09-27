<?php

namespace App\Support;

use Illuminate\Pagination\LengthAwarePaginator;

class CleanPaginator extends LengthAwarePaginator
{
    public function url($page)
    {
        $page = max(1, (int) $page);
        $path = preg_replace('#/page/\d+$#', '', rtrim($this->path(), '/'));

        return $page > 1 ? $path.'/page/'.$page : $path;
    }
}
