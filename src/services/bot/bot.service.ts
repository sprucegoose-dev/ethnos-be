import Card from '../../models/card.model';
import Player from '../../models/player.model';
import Region from '../../models/region.model';
import { ActionService } from '../action/action.service';

class BotService {

    evaluateRegions() {

    }

    evaluateBands(cardsInHand: Card[], regions: Region[], age: number) {

        // value of band + points from region

        // will action add token to region?

        // long term investment in region

    }

    takeTurn(gameId: number, player: Player) {
        const actions = ActionService.getActions(gameId, player.userId);

        // if free token action, go from region with highest tokens to lowest tokens, and see which
        // region would be worth the most victory points

        // if not enough cards to add token to region:
        // try to draw card from market to increase band either by tribe or color



    }
}
