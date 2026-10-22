<?php

namespace Payment\Bidv\Facades;

use Illuminate\Support\Facades\Facade;
use Payment\Bidv\Bank;

/**
 * Class AssetsFacade.
 *
 * @since 22/07/2015 11:25 PM
 */
class BidvFacade extends Facade
{
	/**
	 * @return string
	 */
	protected static function getFacadeAccessor()
	{
		return Bank::class;
	}
}